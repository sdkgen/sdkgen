Pod::Spec.new do |spec|  
  spec.name                    = 'SdkgenRuntime'
  spec.version                 = '0.1.0'
  spec.summary                 = 'Cubos sdkgen.'
  spec.homepage                = 'http://cubos.io'

  spec.author                  = 'Cubos'
  spec.license                 = { :type => "Copyright", :text => "Copyright 2020 Cubos. All Rights Reserved." }
  spec.homepage                = "https://github.com/sdkgen/sdkgen"

  spec.platform                = :ios
  # s.source                  = { :http => 'https://storage.googleapis.com/aarin-ios-framework/aarin-1.0.2.zip' }
  spec.source                  = { :http => 'file:' + __dir__ + '/sdkgen-0.1.0.zip' }

  # spec.public_header_files     = "SdkgenRuntime.framework/Headers/*.h"
  # spec.source_files            = "SdkgenRuntime.framework/Headers/*.h"
  # spec.ios.vendored_frameworks = 'SdkgenRuntime/SdkgenRuntime.framework'
  # spec.vendored_frameworks     = "SdkgenRuntime.framework"
  # spec.source_files            = 'ios-runtime/core/*.swift'
  spec.source_files = 'SdkgenRuntime/Classes/**/*'

  spec.platform = :ios
  spec.ios.deployment_target = '12.1'
  spec.swift_version = "5.0"
  
  # spec.pod_target_xcconfig = { 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'arm64' }
  # spec.user_target_xcconfig = { 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'arm64' }

  spec.dependency 'Alamofire', "~> 5.4"
  spec.dependency 'KeychainSwift'

end 
