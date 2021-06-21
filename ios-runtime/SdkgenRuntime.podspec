Pod::Spec.new do |spec|  
  spec.name                    = 'SdkgenRuntime'
  spec.version                 = '0.1.0'
  spec.summary                 = 'Cubos sdkgen.'

  spec.author                  = 'Cubos'
  spec.license                 = 'MIT'
  spec.homepage                = 'https://github.com/sdkgen/sdkgen'
  spec.documentation_url       = 'https://github.com/sdkgen/sdkgen'

  spec.source                  = { :git => 'https://github.com/sdkgen/sdkgen', :tag => spec.version }

  spec.source_files = 'SdkgenRuntime/Classes/**/*.swift'
  # spec.source_files = 'ios-runtime/SdkgenRuntime/Classes/**/*.swift'

  spec.platform = :ios
  spec.ios.deployment_target = '12.1'
  spec.swift_version = ['5.1', '5.2', '5.3']

  spec.dependency 'Alamofire', "~> 5.4"
  spec.dependency 'KeychainSwift'

end 
